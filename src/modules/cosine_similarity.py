import sys
import os
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity

def myTokenizer(text):
    return text.split("£")

def remove_reserved_words(result_string):
    parts = result_string.split('£')
    filtered_parts = [part for part in parts if not part.startswith('r_')]
    return '£'.join(filtered_parts)

def remove_delimiters(result_string_v2, py):
    if py:
        parts = result_string_v2.split('£')
        unwanted_substrings = ["(paren",")paren","eof","s_:","s_."]
        filtered_parts = [part for part in parts if part not in unwanted_substrings]
        output_string = '£'.join(filtered_parts)
        return output_string
    else:
        parts = result_string_v2.split('£')
        unwanted_substrings = ["(paren",")paren","eof","s_.","suffix:semicolon","(brace",")brace"]
        filtered_parts = [part for part in parts if part not in unwanted_substrings]
        output_string = '£'.join(filtered_parts)
        return output_string

def load_tokens(path):
    with open(path, 'r', encoding="utf8") as file:
        lines = file.readlines()
    third_column_elements = [line.strip().split('\t')[2] for line in lines]
    result_string = '£'.join(third_column_elements)
    is_py_snippet = os.path.basename(path).startswith('py_')
    result_string_v2 = remove_reserved_words(result_string)
    final_string = remove_delimiters(result_string_v2,is_py_snippet)
    return final_string

def check_sim(tokens1, tokens2):
    text = [tokens1, tokens2]
    
    vectorizer = CountVectorizer(tokenizer=myTokenizer, token_pattern=None)
    model = vectorizer.fit_transform(text)
    # compute the cosine similarity between documents in the model
    cos = cosine_similarity(model)
    return cos[0][1]

def main():
    source_generated_file = sys.argv[1]
    snippet_extracted_file = sys.argv[2]
    
    source_generated_tokens = load_tokens(source_generated_file)
    snippet_extracted_tokens = load_tokens(snippet_extracted_file)
    
    similarity_score = check_sim(source_generated_tokens, snippet_extracted_tokens)
    print(similarity_score)

if __name__ == "__main__":
    main()